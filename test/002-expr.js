'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const stlc = require( '../src/stlc.js' );

describe ('Expr', () => {
    const u = new stlc.Universe;
    u.addType('bool').addCons('true').addCons('false');
    u.addType('nat').addCons('zero').addCons('next', 'nat');

    const uTrue  = u.create('bool', 'true');
    const uFalse = u.create('bool', 'false');
    const uZero  = u.create('nat',  'zero');
    const uOne   = u.create('nat',  'next', uZero );
    const uTwo   = u.create('nat',  'next', uOne );

    it( 'can eval with empty context', done => {
        const expr = new stlc.ExprCons( u, 'bool', 'true' );

        expect( expr.deps ).to.deep.equal( {} );

        expect( expr.eval({foo: uOne}).eq(uTrue) ).to.equal(true);
        expect( expr.eval({foo: uOne}).eq(uFalse) ).to.equal(false);

        done();
    } );

    it( 'can eval a free variable to itself', done => {
        const expr = new stlc.ExprFree( u, 'nat', 'foo');

        expect( expr.toString() ).to.equal('foo:nat');

        expect( () => { expr.eval({}) } ).to.throw(/Unsatisfied/);
        const one = expr.eval( { foo : uOne } );
        expect( one.eq(uOne) ).to.equal( true );

        done();
    });

    it( 'can eval an expr dependent on free var', done => {
        const foo = new stlc.ExprFree( u, 'nat', 'foo' );
        const expr = new stlc.ExprCons( u, 'nat', 'next', foo );

        expect(expr.toString()).to.equal('nat{foo:nat}<...>');
        expect(expr.deps).to.deep.equal({ foo : u.type('nat') });

        expect( () => { expr.eval({}) } ).to.throw(/Unsatisfied/);
        const one = expr.eval( { foo : uZero } );
        expect( one.eq(uOne) ).to.equal( true );

        done();
    });

    it ('can pattern-match', done => {
        const free = u.freeVar( 'nat', 'foo' );
        const nonzero = new stlc.ExprMatch( u, 'nat', free, {
            zero: new stlc.Func( [], uFalse ),
            next: new stlc.Func( [['unused', u.type('nat')]], uTrue ),
        });

        expect( nonzero.eval( { foo: uZero } ).eq(uFalse) ).to.equal(true);
        expect( nonzero.eval( { foo: uOne } ).eq(uTrue) ).to.equal(true);
        expect( nonzero.eval( { foo: uTwo } ).eq(uTrue) ).to.equal(true);

        done();
    });

    it ('can pattern-match even better', done => {
        const prev = u.func( [['x', 'nat']], new stlc.ExprMatch(
            u,
            'nat',
            u.freeVar( 'nat', 'x' ),
            {
                zero: u.func([], uZero),
                next: u.func([['n', 'nat']], u.freeVar('nat', 'n')),
            }
        ));

        // important! function has no external free vars in it
        expect( prev.deps ).to.deep.equal({});

        expect( _=>prev.apply({}, uZero) ).to.throw(/Bad arguments/);
        expect( _=>prev.apply([uZero]) ).to.throw(/Bad arguments/);
        expect( _=>prev.apply(uZero) ).to.throw(/Bad arguments/);

        is( prev.apply({}, [uZero]), uZero );
        is( prev.apply({}, [uOne]), uZero );
        is( prev.apply({}, [uTwo]), uOne );

        const apply = new stlc.ExprApply( u, 'nat', prev, [u.freeVar('nat', 'x')]);

        is( apply.eval({x : uTwo}), uOne);

        done();
    });

    it ('handles errors', done => {
        expect( _ => new stlc.ExprMatch( u, 'nat', u.freeVar( 'nat', 'x' ), {} ) )
            .to.throw(/No mapping.*in pattern match/);

        expect( _ => new stlc.Func(['foo', 'bar'], u.freeVar('nat', 'foo')))
            .to.throw(/Array of pairs expected/);
        expect( _ => new stlc.Func([['foo', 'bar']], u.freeVar('nat', 'foo')))
            .to.throw(/Func: types expected/);

        done();
    });
});

function is(got, exp) {
    expect( exp.eq(got) ).to.equal(true);
};
